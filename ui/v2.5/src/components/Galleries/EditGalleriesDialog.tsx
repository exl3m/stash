import React, { useEffect, useState } from "react";
import { Form, Col, Row } from "react-bootstrap";
import { FormattedMessage, useIntl } from "react-intl";
import isEqual from "lodash-es/isEqual";
import { useBulkGalleryUpdate } from "src/core/StashService";
import * as GQL from "src/core/generated-graphql";
import { StudioSelect, Modal } from "src/components/Shared";
import { useToast } from "src/hooks";
import { FormUtils } from "src/utils";
import MultiSet from "../Shared/MultiSet";
import { RatingStars } from "../Scenes/SceneDetails/RatingStars";
import {
  getAggregateInputIDs,
  getAggregateInputValue,
  getAggregatePerformerIds,
  getAggregateRating,
  getAggregateStudioId,
  getAggregateTagIds,
} from "src/utils/bulkUpdate";
import { faPencilAlt } from "@fortawesome/free-solid-svg-icons";

interface IListOperationProps {
  selected: GQL.SlimGalleryDataFragment[];
  onClose: (applied: boolean) => void;
}

export const EditGalleriesDialog: React.FC<IListOperationProps> = (
  props: IListOperationProps
) => {
  const intl = useIntl();
  const Toast = useToast();
  const [title, setTitle] = useState<string>();
  const [rating, setRating] = useState<number>();
  const [studioId, setStudioId] = useState<string>();
  const [
    performerMode,
    setPerformerMode,
  ] = React.useState<GQL.BulkUpdateIdMode>(GQL.BulkUpdateIdMode.Add);
  const [performerIds, setPerformerIds] = useState<string[]>();
  const [existingPerformerIds, setExistingPerformerIds] = useState<string[]>();
  const [tagMode, setTagMode] = React.useState<GQL.BulkUpdateIdMode>(
    GQL.BulkUpdateIdMode.Add
  );
  const [tagIds, setTagIds] = useState<string[]>();
  const [existingTagIds, setExistingTagIds] = useState<string[]>();
  const [organized, setOrganized] = useState<boolean | undefined>();

  const [updateGalleries] = useBulkGalleryUpdate();

  // Network state
  const [isUpdating, setIsUpdating] = useState(false);

  const checkboxRef = React.createRef<HTMLInputElement>();

  function getGalleryInput(): GQL.BulkGalleryUpdateInput {
    // need to determine what we are actually setting on each gallery
    const aggregateRating = getAggregateRating(props.selected);
    const aggregateStudioId = getAggregateStudioId(props.selected);
    const aggregatePerformerIds = getAggregatePerformerIds(props.selected);
    const aggregateTagIds = getAggregateTagIds(props.selected);

    const galleryInput: GQL.BulkGalleryUpdateInput = {
      ids: props.selected.map((gallery) => {
        return gallery.id;
      }),
    };

    if (title !== undefined) {
      galleryInput.title = title;
    }

    galleryInput.rating = getAggregateInputValue(rating, aggregateRating);
    galleryInput.studio_id = getAggregateInputValue(
      studioId,
      aggregateStudioId
    );

    galleryInput.performer_ids = getAggregateInputIDs(
      performerMode,
      performerIds,
      aggregatePerformerIds
    );
    galleryInput.tag_ids = getAggregateInputIDs(
      tagMode,
      tagIds,
      aggregateTagIds
    );

    if (organized !== undefined) {
      galleryInput.organized = organized;
    }

    return galleryInput;
  }

  async function onSave() {
    setIsUpdating(true);
    try {
      await updateGalleries({
        variables: {
          input: getGalleryInput(),
        },
      });
      Toast.success({
        content: intl.formatMessage(
          { id: "toast.updated_entity" },
          {
            entity: intl.formatMessage({ id: "galleries" }).toLocaleLowerCase(),
          }
        ),
      });
      props.onClose(true);
    } catch (e) {
      Toast.error(e);
    }
    setIsUpdating(false);
  }

  useEffect(() => {
    const state = props.selected;
    let updateTitle: string | undefined;
    let updateRating: number | undefined;
    let updateStudioID: string | undefined;
    let updatePerformerIds: string[] = [];
    let updateTagIds: string[] = [];
    let updateOrganized: boolean | undefined;
    let first = true;

    state.forEach((gallery: GQL.SlimGalleryDataFragment) => {
      const galleryTitle = gallery.title;
      const galleryRating = gallery.rating;
      const GalleriestudioID = gallery?.studio?.id;
      const galleryPerformerIDs = (gallery.performers ?? [])
        .map((p) => p.id)
        .sort();
      const galleryTagIDs = (gallery.tags ?? []).map((p) => p.id).sort();

      if (first) {
        updateTitle = galleryTitle ?? undefined;
        updateRating = galleryRating ?? undefined;
        updateStudioID = GalleriestudioID;
        updatePerformerIds = galleryPerformerIDs;
        updateTagIds = galleryTagIDs;
        updateOrganized = gallery.organized;
        first = false;
      } else {
        if (galleryTitle !== updateTitle) {
          updateTitle = undefined;
        }
        if (galleryRating !== updateRating) {
          updateRating = undefined;
        }
        if (GalleriestudioID !== updateStudioID) {
          updateStudioID = undefined;
        }
        if (!isEqual(galleryPerformerIDs, updatePerformerIds)) {
          updatePerformerIds = [];
        }
        if (!isEqual(galleryTagIDs, updateTagIds)) {
          updateTagIds = [];
        }
        if (gallery.organized !== updateOrganized) {
          updateOrganized = undefined;
        }
      }
    });

    setTitle(updateTitle);
    setRating(updateRating);
    setStudioId(updateStudioID);
    setExistingPerformerIds(updatePerformerIds);
    setExistingTagIds(updateTagIds);

    setOrganized(updateOrganized);
  }, [props.selected]);

  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = organized === undefined;
    }
  }, [organized, checkboxRef]);

  function renderMultiSelect(
    type: "performers" | "tags",
    ids: string[] | undefined
  ) {
    let mode = GQL.BulkUpdateIdMode.Add;
    let existingIds: string[] | undefined = [];
    switch (type) {
      case "performers":
        mode = performerMode;
        existingIds = existingPerformerIds;
        break;
      case "tags":
        mode = tagMode;
        existingIds = existingTagIds;
        break;
    }

    return (
      <MultiSet
        type={type}
        disabled={isUpdating}
        onUpdate={(itemIDs) => {
          switch (type) {
            case "performers":
              setPerformerIds(itemIDs);
              break;
            case "tags":
              setTagIds(itemIDs);
              break;
          }
        }}
        onSetMode={(newMode) => {
          switch (type) {
            case "performers":
              setPerformerMode(newMode);
              break;
            case "tags":
              setTagMode(newMode);
              break;
          }
        }}
        existingIds={existingIds ?? []}
        ids={ids ?? []}
        mode={mode}
      />
    );
  }

  function cycleOrganized() {
    if (organized) {
      setOrganized(undefined);
    } else if (organized === undefined) {
      setOrganized(false);
    } else {
      setOrganized(true);
    }
  }

  function render() {
    return (
      <Modal
        show
        icon={faPencilAlt}
        header={intl.formatMessage(
          { id: "dialogs.edit_entity_title" },
          {
            count: props?.selected?.length ?? 1,
            singularEntity: intl.formatMessage({ id: "gallery" }),
            pluralEntity: intl.formatMessage({ id: "galleries" }),
          }
        )}
        accept={{
          onClick: onSave,
          text: intl.formatMessage({ id: "actions.apply" }),
        }}
        cancel={{
          onClick: () => props.onClose(false),
          text: intl.formatMessage({ id: "actions.cancel" }),
          variant: "secondary",
        }}
        isRunning={isUpdating}
      >
        <Form>
          <Form.Group controlId="title" as={Row}>
            {FormUtils.renderLabel({
              title: intl.formatMessage({ id: "title" }),
            })}
            <Col xs={9}>
              <Form.Control
                id={"title"}
                className={"text-input"}
                placeholder={"Bulk Rename, $1"}
                onChange={(event) => setTitle(event.target.value)}
              />
            </Col>
          </Form.Group>

          <Form.Group controlId="rating" as={Row}>
            {FormUtils.renderLabel({
              title: intl.formatMessage({ id: "rating" }),
            })}
            <Col xs={9}>
              <RatingStars
                value={rating}
                onSetRating={(value) => setRating(value)}
                disabled={isUpdating}
              />
            </Col>
          </Form.Group>

          <Form.Group controlId="studio" as={Row}>
            {FormUtils.renderLabel({
              title: intl.formatMessage({ id: "studio" }),
            })}
            <Col xs={9}>
              <StudioSelect
                onSelect={(items) =>
                  setStudioId(items.length > 0 ? items[0]?.id : undefined)
                }
                ids={studioId ? [studioId] : []}
                isDisabled={isUpdating}
              />
            </Col>
          </Form.Group>

          <Form.Group controlId="performers">
            <Form.Label>
              <FormattedMessage id="performers" />
            </Form.Label>
            {renderMultiSelect("performers", performerIds)}
          </Form.Group>

          <Form.Group controlId="tags">
            <Form.Label>
              <FormattedMessage id="tags" />
            </Form.Label>
            {renderMultiSelect("tags", tagIds)}
          </Form.Group>

          <Form.Group controlId="organized">
            <Form.Check
              type="checkbox"
              label={intl.formatMessage({ id: "organized" })}
              checked={organized}
              ref={checkboxRef}
              onChange={() => cycleOrganized()}
            />
          </Form.Group>
        </Form>
      </Modal>
    );
  }

  return render();
};
